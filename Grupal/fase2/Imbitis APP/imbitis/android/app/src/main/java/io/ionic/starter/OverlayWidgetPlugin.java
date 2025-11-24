package io.ionic.starter;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;

import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import io.ionic.starter.R;

@CapacitorPlugin(name = "OverlayWidget")
public class OverlayWidgetPlugin extends Plugin {
  private static final int REQUEST_OVERLAY_PERMISSION = 1337;
  private static final String PREF_FILE = "ImbitisWidgetPrefs";
  private static final String KEY_WIDGET_ENABLED = "widgetEnabled";

  private static final Object OVERLAY_LOCK = new Object();
  private static WindowManager windowManager;
  private static View overlayView;
  private static WindowManager.LayoutParams overlayParams;
  private static CountDownLatch overlayCreationLatch;

  private PluginCall pendingPermissionCall;
  private boolean appInForeground = true;
  private Context appContext;

  @Override
  public void load() {
    super.load();
    Context initialContext = getContext();
    if (initialContext != null) {
      appContext = initialContext.getApplicationContext();
    } else if (getActivity() != null) {
      appContext = getActivity().getApplicationContext();
    }
    syncOverlayVisibility();
  }

  @PluginMethod
  public void enable(PluginCall call) {
    boolean enabled = hasOverlayPermission();
    setWidgetPreference(enabled);
    syncOverlayVisibility();
    call.resolve();
  }

  @PluginMethod
  public void disable(PluginCall call) {
    setWidgetPreference(false);
    removeOverlay();
    call.resolve();
  }

  @PluginMethod
  public void getState(PluginCall call) {
    JSObject result = new JSObject();
    result.put("enabled", isWidgetEnabled());
    result.put("granted", hasOverlayPermission());
    call.resolve(result);
  }

  @PluginMethod
  public void hasPermission(PluginCall call) {
    JSObject result = new JSObject();
    result.put("granted", hasOverlayPermission());
    call.resolve(result);
  }

  @PluginMethod
  public void requestPermission(PluginCall call) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      JSObject result = new JSObject();
      result.put("granted", true);
      call.resolve(result);
      return;
    }

    if (hasOverlayPermission()) {
      JSObject result = new JSObject();
      result.put("granted", true);
      call.resolve(result);
      return;
    }

    Intent intent = new Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:" + getSafePackageName())
    );
    pendingPermissionCall = call;
    startActivityForResult(call, intent, REQUEST_OVERLAY_PERMISSION);
  }

  @Override
  protected void handleOnActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
    super.handleOnActivityResult(requestCode, resultCode, data);
    if (requestCode == REQUEST_OVERLAY_PERMISSION && pendingPermissionCall != null) {
      boolean granted = hasOverlayPermission();
      JSObject result = new JSObject();
      result.put("granted", granted);
      pendingPermissionCall.resolve(result);
      pendingPermissionCall = null;
      if (!granted) {
        setWidgetPreference(false);
        removeOverlay();
      } else if (isWidgetEnabled()) {
        if (!appInForeground) {
          boolean shown = ensureOverlay();
          if (!shown) {
            setWidgetPreference(false);
            removeOverlay();
          }
        } else {
          removeOverlay();
        }
      }
    }
  }

  @PluginMethod
  public void setAppState(PluginCall call) {
    boolean active = call.getBoolean("active", true);
    appInForeground = active;
    syncOverlayVisibility();
    call.resolve();
  }


  private boolean ensureOverlay() {
    if (!hasOverlayPermission()) {
      return false;
    }

    final Context context = getEffectiveContext();
    if (context == null) {
      return false;
    }

    if (overlayView != null) {
      return true;
    }

    CountDownLatch latch;
    boolean shouldCreate = false;
    synchronized (OVERLAY_LOCK) {
      if (overlayView != null) {
        return true;
      }
      if (overlayCreationLatch == null) {
        overlayCreationLatch = new CountDownLatch(1);
        shouldCreate = true;
      }
      latch = overlayCreationLatch;
    }

    if (!shouldCreate) {
      try {
        latch.await(500, TimeUnit.MILLISECONDS);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
      return overlayView != null;
    }

    AtomicBoolean success = new AtomicBoolean(false);
    CountDownLatch creationLatch = latch;

    getBridge().executeOnMainThread(() -> {
      try {
        synchronized (OVERLAY_LOCK) {
          if (overlayView != null) {
            success.set(true);
            return;
          }
        }

        WindowManager manager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        if (manager == null) {
          return;
        }

        LayoutInflater inflater = LayoutInflater.from(context);
        View view = inflater.inflate(R.layout.overlay_widget_layout, null);

        View button = view.findViewById(R.id.overlay_container);
        if (button != null) {
          button.setOnClickListener(v -> {
            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(intent);
          });
        }

        int layoutType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.END;
        params.x = 48;
        params.y = 200;

        synchronized (OVERLAY_LOCK) {
          windowManager = manager;
          overlayParams = params;
          overlayView = view;
        }

        setupDrag(view);

        manager.addView(view, params);
        success.set(true);
      } catch (Exception ex) {
        synchronized (OVERLAY_LOCK) {
          overlayView = null;
          overlayParams = null;
        }
      } finally {
        creationLatch.countDown();
        synchronized (OVERLAY_LOCK) {
          overlayCreationLatch = null;
        }
      }
    });

    try {
      creationLatch.await(500, TimeUnit.MILLISECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }

    return success.get();
  }

  private void removeOverlay() {
    final View viewToRemove;
    final WindowManager manager;
    synchronized (OVERLAY_LOCK) {
      viewToRemove = overlayView;
      manager = windowManager;
      if (viewToRemove == null || manager == null) {
        overlayView = null;
        overlayParams = null;
        return;
      }
    }

    CountDownLatch latch = new CountDownLatch(1);
    getBridge().executeOnMainThread(() -> {
      try {
        manager.removeViewImmediate(viewToRemove);
      } catch (Exception ignored) {
        // ignore
      } finally {
        synchronized (OVERLAY_LOCK) {
          if (overlayView == viewToRemove) {
            overlayView = null;
            overlayParams = null;
          }
        }
        latch.countDown();
      }
    });

    try {
      latch.await(500, TimeUnit.MILLISECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private void setupDrag(View view) {
    if (view == null) {
      return;
    }

    view.setOnTouchListener(new View.OnTouchListener() {
      private int initialX;
      private int initialY;
      private float initialTouchX;
      private float initialTouchY;

      @Override
      public boolean onTouch(View v, MotionEvent event) {
        if (overlayParams == null || windowManager == null) {
          return false;
        }

        switch (event.getAction()) {
          case MotionEvent.ACTION_DOWN:
            initialX = overlayParams.x;
            initialY = overlayParams.y;
            initialTouchX = event.getRawX();
            initialTouchY = event.getRawY();
            return true;
          case MotionEvent.ACTION_MOVE:
            overlayParams.x = initialX - (int) (event.getRawX() - initialTouchX);
            overlayParams.y = initialY + (int) (event.getRawY() - initialTouchY);
            try {
              windowManager.updateViewLayout(overlayView, overlayParams);
            } catch (Exception ignored) {
              // ignore
            }
            return true;
          case MotionEvent.ACTION_UP:
            // treat as click if movement small
            float deltaX = Math.abs(event.getRawX() - initialTouchX);
            float deltaY = Math.abs(event.getRawY() - initialTouchY);
            if (deltaX < 10 && deltaY < 10) {
              v.performClick();
            }
            return true;
          default:
            return false;
        }
      }
    });
  }

  private void setWidgetPreference(boolean enabled) {
    Context context = getAppContext();
    if (context == null) {
      return;
    }
    context
        .getSharedPreferences(PREF_FILE, Context.MODE_PRIVATE)
        .edit()
        .putBoolean(KEY_WIDGET_ENABLED, enabled)
        .apply();
  }

  private boolean isWidgetEnabled() {
    Context context = getAppContext();
    if (context == null) {
      return false;
    }
    return context
        .getSharedPreferences(PREF_FILE, Context.MODE_PRIVATE)
        .getBoolean(KEY_WIDGET_ENABLED, false);
  }

  private boolean hasOverlayPermission() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return true;
    }
    Context context = getEffectiveContext();
    return context != null && Settings.canDrawOverlays(context);
  }

  private void syncOverlayVisibility() {
    if (!isWidgetEnabled() || !hasOverlayPermission()) {
      removeOverlay();
      return;
    }

    if (appInForeground) {
      removeOverlay();
      return;
    }

    if (!ensureOverlay()) {
      setWidgetPreference(false);
      removeOverlay();
    }
  }

  private Context getAppContext() {
    if (appContext != null) {
      return appContext;
    }
    Context context = getContext();
    if (context != null) {
      appContext = context.getApplicationContext();
      return appContext;
    }
    if (getActivity() != null) {
      appContext = getActivity().getApplicationContext();
      return appContext;
    }
    return null;
  }

  private Context getEffectiveContext() {
    Context context = getContext();
    if (context != null) {
      return context;
    }
    if (appContext != null) {
      return appContext;
    }
    return getActivity();
  }

  private String getSafePackageName() {
    Context context = getEffectiveContext();
    return context != null ? context.getPackageName() : "";
  }
}
